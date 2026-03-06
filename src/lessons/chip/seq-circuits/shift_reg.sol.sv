module shift_reg(
  input        clk, reset, serial_in,
  output reg [3:0] parallel_out
);
  always @(posedge clk) begin
    if (reset)
      parallel_out <= 4'b0;
    else
      parallel_out <= {parallel_out[2:0], serial_in};
  end
endmodule
