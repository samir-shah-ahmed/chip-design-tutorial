module enable_div #(parameter N = 4) (
  input clk,
  input rst,
  output reg ce
);
  reg [7:0] count;
  always @(posedge clk) begin
    if (rst) begin
      count <= 0;
      ce <= 1'b0;
    end else if (count == N - 1) begin
      count <= 0;
      ce <= 1'b1;
    end else begin
      count <= count + 1'b1;
      ce <= 1'b0;
    end
  end
endmodule
