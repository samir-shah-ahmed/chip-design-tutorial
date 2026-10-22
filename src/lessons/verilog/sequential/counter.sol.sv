module counter #(parameter WIDTH = 4) (
  input clk,
  input rst,
  output reg [WIDTH-1:0] count
);
  always @(posedge clk) begin
    if (rst)
      count <= {WIDTH{1'b0}};
    else
      count <= count + 1'b1;
  end
endmodule
