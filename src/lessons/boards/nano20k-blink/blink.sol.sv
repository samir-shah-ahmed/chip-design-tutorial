module blink #(parameter LIMIT = 4, parameter WIDTH = 6) (
  input clk,
  input rst_n,
  output reg [WIDTH-1:0] led
);
  reg [23:0] count;
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      count <= 24'd0;
      led <= {6{1'b1}};
    end else if (count == LIMIT) begin
      count <= 24'd0;
      led <= ~led;
    end else begin
      count <= count + 24'd1;
    end
  end
endmodule
